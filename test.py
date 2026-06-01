i = 0

try:
    i = 1/0
except Exception as e:

    print(str(e))
    print(type(e))
    raise e 